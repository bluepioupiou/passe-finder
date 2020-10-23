<?php
$this->breadcrumbs=array(
	'Passes'=>array('index'),
	$model->name,
);
$passeFavoris = FavorisPasse::Model()->findByAttributes(array('user_id'=>Yii::app()->user->id, 'passe_id'=>$model->id));
$personnalize = PersonnalizePasse::model()->findByAttributes(array('user_id'=>Yii::app()->user->id,'passe_id'=>$model->id));
		
$this->menu=array(
	array('label'=>'Modifier', 'url'=>array('update', 'id'=>$model->id), 'visible'=>$model->userCreate_id==Yii::app()->user->id),
	array('label'=>'Supprimer', 'url'=>'#', 'linkOptions'=>array('submit'=>array('delete','id'=>$model->id),'confirm'=>'Etes vous sur de vouloir supprimer cette passe ?'), 'visible'=>$model->userCreate_id==Yii::app()->user->id),	
	array('label'=>'Annuler le nom personnalisé', 'url'=>array('unsetPersonnalize', 'id'=>$model->id), 'visible'=>$personnalize != null),
	array('label'=>'Sauvegarder dans mes favoris', 'url'=>array('setFavoris', 'id'=>$model->id), 'visible'=>!$passeFavoris),
	array('label'=>'Enlever de mes favoris', 'url'=>array('unsetFavoris', 'id'=>$model->id), 'visible'=>$passeFavoris != null),
);

?>

<h2>Passe 
<?php
    if (!Yii::app()->user->isGuest){
		$this->widget('editable.EditableField', array(
			'type'      => 'text',
			'model'     => $model,
			'attribute' => 'name',
			'title' => 'Personnaliser le nom',
			'url'       => $this->createUrl('passe/personnalizeName'), 
			'placement' => 'right',
			'validate' => 'js: function(value) {
				if($.trim(value) == "") return "Champs obligatoire";
			}'
		));
	}
	else {
		echo $model->name;
	}
?>
</h2>
<?php
	if ($model->pending){
		echo "<i>Cette passe est en attente de validation. En attendant, elle ne sera visible que par vous et non utilisable dans une passe</i><br />";
	}
?>
<?php 
	$image_path = Yii::app()->baseURL."/images/positions/position_".$model->positionStart->id.".jpg";
	if($model->positionStart->image == null){
		$image_path = Yii::app()->baseURL."/images/positions/no_position.jpg";
	}		 
?>
<img src="<?php echo $image_path; ?>" style="width:265px;"/>

<?php 
	$image_path = Yii::app()->baseURL."/images/positions/position_".$model->positionEnd->id.".jpg";
	if($model->positionEnd->image == null){
		$image_path = Yii::app()->baseURL."/images/positions/no_position.jpg";
	}		 
?>
<img src="<?php echo $image_path; ?>" style="width:265px;"/>
<br />

<?php $this->widget('zii.widgets.CDetailView', array(
	'data'=>$model,
	'attributes'=>array(
		array('label'=>'danse', 'value'=>$model->danse->name),		
		'difficulty',
		'description',
		'progress',
		'dateCreate',
		'dateMaj',
		
	),
)); ?>
<br/>
<?php 
	if ($model->youtube_url != ""){
?>
Vidéo de cette passe : <br/>
<iframe width="560" height="315" src="http://www.youtube.com/embed/<?php echo $model->youtube_url;?>?rel=0" frameborder="0" allowfullscreen></iframe>
<?php
	}
?>
<br /><br />
	<div id="startPasse"> Passes pouvant s'enchainer avec celle ci (<?php echo $model->positionEnd->passesStartCount; ?>):
	<br /><ul>
<?php
	foreach($model->positionEnd->passesStart as $passe){
		echo '<li>'.CHtml::link(CHtml::encode($passe->name), array('passe/view', 'id'=>$passe->id)).'</li>';
	}
?>
	</ul>
	</div>
	
<br /><br />
	<div id="startPasse"> Passes débouchants celle ci (<?php echo $model->positionStart->passesEndCount; ?>):
	<br /><ul>
<?php
	foreach($model->positionStart->passesEnd as $passe){
		echo '<li>'.CHtml::link(CHtml::encode($passe->name), array('passe/view', 'id'=>$passe->id)).'</li>';
	}
?>
	</ul>
	</div>

<br /><br />
	<div id="startPasse"> Alternatives de fin de passe (<?php echo $model->positionEnd->alternativesStartCount; ?>):
	<br /><ul>
<?php
	foreach($model->positionEnd->alternativesStart as $alternative){
		echo '<li>'.CHtml::link(CHtml::encode($alternative->positionAlternative->name), array('position/view', 'id'=>$alternative->positionAlternative->id)).'</li>';
	}
?>
	</ul>
	</div>
	
	<br /><br />
	<div id="startPasse"> Enchainements (<?php echo $model->enchainementsCount; ?>):
	<br /><ul>
<?php
	foreach($model->enchainements as $enchainement){
		echo '<li>'.CHtml::link(CHtml::encode($enchainement->name), array('enchainement/view', 'id'=>$enchainement->id)).'</li>';
	}
?>
	</ul>
	</div>
	
