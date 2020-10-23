<?php
$this->breadcrumbs=array(
	'Cours'=>array('index'),
	$model->name,
);
$inscriptionUser = Userlesson::Model()->findByAttributes(array('user_id'=>Yii::app()->user->id, 'lesson_id'=>$model->id));
$this->menu=array(
	array('label'=>'Modifier', 'url'=>array('update', 'id'=>$model->id),'visible'=>$model->userTeacher_id==Yii::app()->user->id || $model->school->userManager_id==Yii::app()->user->id),
	array('label'=>'Supprimer', 'url'=>'#', 'visible'=>$model->userTeacher_id==Yii::app()->user->id, 'linkOptions'=>array('submit'=>array('delete','id'=>$model->id),'confirm'=>'Are you sure you want to delete this item?')),
	array('label'=>'S\'inscrire', 'url'=>array('subscribe', 'id'=>$model->id), 'visible'=>!$inscriptionUser),	
	array('label'=>'Annuler l\'inscription', 'url'=>array('unsubscribe', 'id'=>$model->id), 'visible'=>($inscriptionUser && $inscriptionUser->pending)),	
	array('label'=>'Se désinscrire', 'url'=>array('unsubscribe', 'id'=>$model->id), 'visible'=>($inscriptionUser && !$inscriptionUser->pending)),	
);
?>

<h1>Cours <?php echo $model->name; ?></h1>

<?php 
	if ($inscriptionUser){
		if ($inscriptionUser->pending){
?>
			<span class="alert i_warning">Votre inscription est en cours de validation.</span><br />
<?php		
		} else {
?>
			<span class="alert i_valid">Vous êtes inscrit à ce cours.</span><br />
<?php
		}
	} 
?>

<?php $this->widget('zii.widgets.CDetailView', array(
	'data'=>$model,
	'attributes'=>array(
		array(               
            'name'=>'school_id',
            'type'=>'raw',
            'value'=>CHtml::link(
				CHtml::encode($model->school->name),
                array('school/view','id'=>$model->school->id)
			),
		),		
		array('name'=>'danse_id', 'value'=>$model->danse->name),				
		array('name'=>'userTeacher_id', 'value'=>$model->userTeacher->username),
		'description',
		'time',		
		array('name' =>'private','value'=>$model->private ? 'Oui' : 'Non'),
		array('name' =>'openInscription','value'=>$model->openInscription ? 'Oui' : 'Non'),
		array('name' =>'inscriptions','value'=>$model->inscriptionsCount),
	),
)); 
?>
<br /><hr /><br />
<?php 
	if ($model->private && (!$inscriptionUser or $inscriptionUser->pending)){
?>
		<span class="alert i_info">Ce cours est privé. Vous ne pourrez voir ses enchainements et vidéos qu'en étant inscrit</span><br />
<?php
	}
	else {
?>
<br /><br />
	<div id="startPasse"> Enchainements de ce cours :
	<br /><ul>
<?php
	$data = new CActiveDataProvider('Enchainement', 
		array(
			'criteria'=>array(
				'condition'=>'lesson_id='.$model->id,
				'order'=>'dateEvent DESC'
			),
			'pagination' => array('pageSize' => 5)			
		)
	);
	$this->widget('zii.widgets.grid.CGridView', array(
		'id'=>'enchainements',
		'dataProvider'=>$data,
		'columns'=>array(
			'dateEvent',
			array(            
				'class'=>'CLinkColumn',
				'header'=>'Enchainement',
				'labelExpression'=>'$data->name',
				'urlExpression'=>'Yii::app()->createUrl("enchainement/view",array("id"=>$data->id))',
			),
			array(            
				'name'=>'commentaire',
				'value'=>'$data->commentaire', 
			)
		)
	));
?>
	</ul>
	</div>

<div id="startPasse"> Vidéos de ce cours :
	<br /><ul>
<?php
	$data = new CActiveDataProvider('Video', 
		array(
			'criteria'=>array(
				'with'=>array('enchainement'=>array('joinType'=>'LEFT JOIN')),
				'condition'=>'enchainement.lesson_id='.$model->id,
				'order'=>'enchainement.dateEvent DESC'
			),
			'pagination' => array('pageSize' => 5)			
		)
	);
	$this->widget('zii.widgets.grid.CGridView', array(
		'id'=>'videos',
		'dataProvider'=>$data,
		'columns'=>array(
			'dateCreate',
			array(            
				'class'=>'CLinkColumn',
				'header'=>'Video',
				'labelExpression'=>'$data->enchainement->name',
                'urlExpression'=>'Yii::app()->createUrl("video/view",array("id"=>$data->id))',
			),
			array(            
				'name'=>'description',
				'value'=>'$data->description', 
			)
		)
	));
?>
	</ul>
	</div>
<?php
	}
?>
