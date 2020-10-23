<?php
$this->breadcrumbs=array(
	'Positions'=>array('index'),
	$model->name,
);

$this->menu=array(
	array('label'=>'Modifier', 'url'=>array('update', 'id'=>$model->id), 'visible'=>$model->userCreate_id==Yii::app()->user->id),
	array('label'=>'Supprimer', 'url'=>'#', 'linkOptions'=>array('submit'=>array('delete','id'=>$model->id),'confirm'=>'Etes vous sur de vouloir supprimer cette position ?'), 'visible'=>$model->userCreate_id==Yii::app()->user->id),	
);
?>

<h1>Position <?php echo $model->name; ?></h1>
<?php
	if ($model->pending){
		echo "<i>Cette position est en attente de validation. En attendant, elle ne sera visible que par vous et non utilisable dans un enchainement</i><br />";
	}
?>
<?php 
	$image_path = Yii::app()->baseURL."/images/positions/position_".$model->id.".jpg";
	if($model->image == null){
		$image_path = Yii::app()->baseURL."/images/positions/no_position.jpg";
	}		 
?>
<img src="<?php echo $image_path; ?>" style="width:265px;"/>
<br />
	
<?php 
	$this->widget('zii.widgets.CDetailView', array(
		'data'=>$model,
		'attributes'=>array(
			array('name'=>'danse', 'value'=>$model->danse->name),
			'description',			
			'dateCreate',
			'dateMaj',
			array('name'=>'userCreat', 'value'=>$model->userCreate->username),
		),
	)); 
?>
	<br/><br/>
	<div id="startPasse"> Passes débutants par cette position (<?php echo $model->passesStartCount; ?>):
	</br><ul>
<?php
	foreach($model->passesStart as $passe){
		echo '<li>'.CHtml::link(CHtml::encode($passe->name), array('passe/view', 'id'=>$passe->id)).'</li>';
	}
?>
	</ul>
	</div>

	<br/>
	<div id="endPasse"> Passes finissants par cette position (<?php echo $model->passesEndCount; ?>):
	</br><ul>
<?php
	foreach($model->passesEnd as $passe){
		echo '<li>'.CHtml::link(CHtml::encode($passe->name), array('passe/view', 'id'=>$passe->id)).'</li>';
	}
?>
	</ul>
	</div>	
	
	<br/>
	<div id="alternatives"> Alternatives à cette position (<?php echo $model->alternativesStartCount; ?>):
	</br><ul>
<?php
	foreach($model->alternativesStart as $alternative){
		echo '<li>'.CHtml::link(CHtml::encode($alternative->positionAlternative->name), array('position/view', 'id'=>$alternative->positionAlternative->id)).'</li>';
	}
?>
	</ul>
	</div>	
	
