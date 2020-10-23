<div class="view">

	<b><?php echo CHtml::encode($data->getAttributeLabel('name')); ?>:</b>
	<h3><?php echo CHtml::link(CHtml::encode($data->name), array('view', 'id'=>$data->id)); ?></h3>
	<br />
	<?php 
		$image_path = Yii::app()->baseURL."/images/positions/position_".CHtml::encode($data->id).".jpg";
		if($data->image == null){
			$image_path = Yii::app()->baseURL."/images/positions/no_position.jpg";
		}		 
	?>
	<img src="<?php echo $image_path; ?>" width="100"/>
	<br />
	
	<b><?php echo CHtml::encode($data->getAttributeLabel('danse')); ?>:</b>
	<?php echo CHtml::encode($data->danse->name); ?>
	<br />

	<b><?php echo CHtml::encode($data->getAttributeLabel('description')); ?>:</b>
	<?php echo CHtml::encode($data->description); ?>
	<br />		
</div>